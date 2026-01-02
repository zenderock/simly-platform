# Améliorations du Système de Queue pour l'Envoi de Messages

## 🎯 Problème Résolu

**Avant**: Quand un device était offline, l'envoi de message échouait avec une erreur 500 et le message "device is offline". Le message n'était pas créé en base de données.

**Maintenant**: Les messages sont toujours acceptés et mis en queue, même si le device est offline. Le DispatcherService les enverra automatiquement quand le device reviendra online.

---

## 🔧 Changements Implémentés

### 1. Backend - MessageService (`backend/internal/core/message_service.go`)

#### Nouvelle Logique de Queue Intelligente

Le système utilise maintenant un flag `useQueuedDispatch` pour déterminer si un message doit être mis en queue:

**Messages mis en queue automatiquement quand**:
- ✅ Device spécifié est offline
- ✅ Device est temporairement indisponible (cooldown, suspended, throttled)
- ✅ Aucun device disponible dans le pool
- ✅ Device n'a pas de token FCM valide
- ✅ Message est schedulé pour plus tard

**Avantages**:
- Pas de rejet de messages
- Retry automatique via le DispatcherService
- Respecte le throttling et les send windows
- Cohérent avec le système de campagnes

#### Statuts de Messages

```
"queued"    → En attente, sera traité par le DispatcherService
"pending"   → Assigné à un device, notification FCM envoyée
"scheduled" → Programmé pour une date future
"sent"      → Envoyé avec succès
"delivered" → Livré (confirmation du device)
"failed"    → Échec terminal après tous les retries
```

### 2. Frontend - Gestion des Erreurs (`frontend/components/dashboard/new-message-dialog.tsx`)

#### Affichage des Vraies Erreurs
```typescript
catch (error: any) {
  const errorMessage = error.response?.data || error.message || "Failed to send message. Please try again.";
  toast({
    title: "Error",
    description: errorMessage,  // Affiche le vrai message d'erreur du backend
    variant: "destructive",
  });
}
```

#### Messages de Succès Contextuels
```typescript
let successMessage = "Your message has been queued for delivery.";
if (formData.scheduled_at) {
  successMessage = "Your message has been scheduled successfully.";
} else if (formData.device_id !== "auto") {
  successMessage = "Your message has been sent to the device.";
}
```

---

## 📊 Flux de Traitement

### Scénario 1: Device Online et Disponible
```
User envoie → Status "pending" → FCM envoyé immédiatement → Device envoie SMS
```

### Scénario 2: Device Offline (NOUVEAU)
```
User envoie → Status "queued" → DispatcherService détecte → 
Attend que device soit online → Envoie automatiquement
```

### Scénario 3: Device en Cooldown (NOUVEAU)
```
User envoie → Status "queued" → DispatcherService attend fin cooldown → 
Envoie quand disponible
```

### Scénario 4: Aucun Device Disponible (NOUVEAU)
```
User envoie → Status "queued" → DispatcherService attend device disponible → 
Distribue via round-robin
```

---

## 🔄 Intégration avec le DispatcherService

Le DispatcherService (déjà implémenté dans les tâches précédentes) traite automatiquement:

1. **Récupération des messages en queue**
   ```sql
   SELECT * FROM messages 
   WHERE status = 'queued' 
   ORDER BY priority DESC, created_at ASC
   ```

2. **Sélection intelligente du device**
   - Vérifie le statut online
   - Respecte le throttling (3 sec par défaut)
   - Évite les devices en cooldown (100 msg/10min)
   - Évite les devices suspendus (circuit breaker)

3. **Respect des send windows**
   - Vérifie l'heure locale de l'organisation
   - Pause automatique hors fenêtre (8h-21h par défaut)

4. **Retry automatique**
   - 3 tentatives par défaut
   - Failover vers un autre device si échec

---

## ✅ Tests Recommandés

1. **Test Device Offline**
   - Mettre un device offline
   - Envoyer un message via ce device
   - Vérifier: message créé avec status "queued"
   - Remettre device online
   - Vérifier: message envoyé automatiquement

2. **Test Aucun Device Disponible**
   - Mettre tous les devices offline
   - Envoyer un message avec "Auto"
   - Vérifier: message créé avec status "queued"
   - Remettre un device online
   - Vérifier: message envoyé automatiquement

3. **Test Device en Cooldown**
   - Envoyer 100 messages rapidement sur un device
   - Envoyer un 101ème message
   - Vérifier: message mis en queue
   - Attendre 5 minutes
   - Vérifier: message envoyé après cooldown

---

## 🚀 Prochaines Améliorations Possibles

1. **Indicateur Visuel Frontend**
   - Afficher le statut online/offline des devices dans le sélecteur
   - Badge coloré (vert=online, rouge=offline, orange=cooldown)

2. **Notifications Temps Réel**
   - WebSocket pour notifier l'utilisateur quand un message en queue est envoyé
   - Mise à jour automatique de la liste des messages

3. **Statistiques de Queue**
   - Dashboard montrant le nombre de messages en queue
   - Temps d'attente moyen
   - Taux de succès après mise en queue

4. **Priorité Dynamique**
   - Messages urgents passent devant dans la queue
   - Ajustement automatique basé sur l'âge du message

---

## 📝 Notes Importantes

- **Compatibilité**: Les messages existants avec status "pending" continuent de fonctionner normalement
- **Performance**: La queue est traitée par batch (50 messages par cycle, 1 sec entre cycles)
- **Scalabilité**: Le système peut gérer des milliers de messages en queue
- **Monitoring**: Logs détaillés pour chaque décision de mise en queue

---

Date: 2026-01-02
Auteur: Kiro AI Assistant
