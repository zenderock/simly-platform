# Requirements Document

## Introduction

Ce document définit les exigences pour un système d'envoi intelligent de SMS en masse. Le système actuel envoie les messages de campagne à un rythme de 100 SMS/seconde sur un seul device, ce qui peut bloquer la carte SIM de l'utilisateur ou surcharger le serveur. Le nouveau système implémentera un throttling adaptatif, une distribution sur plusieurs devices, un circuit breaker, et des fenêtres d'envoi configurables pour garantir une livraison fiable sans risque de blocage.

## Glossary

- **Campaign_Dispatcher**: Service backend responsable de l'orchestration de l'envoi des messages d'une campagne
- **Device_Pool**: Ensemble des devices Android connectés et disponibles pour une organisation
- **Throttle_Rate**: Délai minimum entre deux envois de SMS sur un même device (en secondes)
- **Circuit_Breaker**: Mécanisme qui suspend temporairement l'envoi si trop d'échecs consécutifs sont détectés
- **Send_Window**: Plage horaire pendant laquelle l'envoi de SMS est autorisé
- **Device_Cooldown**: Période de repos forcée pour un device après un certain nombre d'envois
- **Batch_Size**: Nombre de messages traités par cycle du dispatcher
- **Failure_Threshold**: Nombre d'échecs consécutifs déclenchant le circuit breaker
- **Round_Robin**: Stratégie de distribution alternant entre les devices disponibles

## Requirements

### Requirement 1

**User Story:** As a campaign manager, I want SMS to be sent at a controlled rate per device, so that my SIM cards don't get blocked by the carrier.

#### Acceptance Criteria

1. WHEN the Campaign_Dispatcher sends a message via a device THEN the system SHALL wait at least the configured Throttle_Rate (default 3 seconds) before sending the next message on the same device
2. WHEN a device has sent 100 messages within a 10-minute window THEN the system SHALL apply a Device_Cooldown period of 5 minutes before resuming sends on that device
3. WHEN the Throttle_Rate is configured per organization THEN the system SHALL respect the organization-specific rate instead of the default
4. WHEN calculating send delays THEN the system SHALL track the last send timestamp per device independently

### Requirement 2

**User Story:** As a campaign manager, I want messages to be distributed across all my available devices, so that campaigns complete faster while respecting per-device limits.

#### Acceptance Criteria

1. WHEN multiple devices are online in the Device_Pool THEN the Campaign_Dispatcher SHALL distribute messages using Round_Robin strategy
2. WHEN a device becomes offline during campaign execution THEN the system SHALL redistribute pending messages to remaining online devices within 30 seconds
3. WHEN selecting the next device THEN the system SHALL skip devices that are in Device_Cooldown or have pending throttle delays
4. WHEN all devices are in cooldown THEN the system SHALL pause campaign processing until at least one device becomes available

### Requirement 3

**User Story:** As a system administrator, I want the system to automatically pause sending when too many failures occur, so that we don't waste resources on a broken connection.

#### Acceptance Criteria

1. WHEN a device experiences 5 consecutive send failures THEN the Circuit_Breaker SHALL suspend that device for 2 minutes
2. WHEN all devices in the Device_Pool are suspended by Circuit_Breaker THEN the system SHALL pause the campaign and notify the organization
3. WHEN the Circuit_Breaker suspension period expires THEN the system SHALL attempt a single test message before resuming normal operation
4. WHEN a device successfully sends after Circuit_Breaker recovery THEN the system SHALL reset the failure counter to zero

### Requirement 4

**User Story:** As a campaign manager, I want to configure sending windows, so that my recipients don't receive SMS at inappropriate hours.

#### Acceptance Criteria

1. WHEN a campaign has a configured Send_Window THEN the Campaign_Dispatcher SHALL only process messages during that time range
2. WHEN the current time is outside the Send_Window THEN the system SHALL pause processing and resume automatically when the window opens
3. WHEN no Send_Window is configured THEN the system SHALL apply a default window of 08:00-21:00 in the organization's timezone
4. WHEN the Send_Window closes during active sending THEN the system SHALL complete the current message and pause subsequent sends within 10 seconds

### Requirement 5

**User Story:** As a campaign manager, I want to see real-time progress of my campaign, so that I can monitor the sending status.

#### Acceptance Criteria

1. WHEN a campaign is processing THEN the system SHALL update campaign analytics (sent, pending, failed counts) within 5 seconds of each status change
2. WHEN the Campaign_Dispatcher pauses (cooldown, circuit breaker, or window) THEN the system SHALL update the campaign status to reflect the pause reason
3. WHEN a campaign completes all messages THEN the system SHALL update the campaign status to "completed" within 30 seconds
4. WHEN querying campaign progress THEN the system SHALL return estimated completion time based on current throughput and remaining messages

### Requirement 6

**User Story:** As a developer, I want the intelligent dispatch system to work for both campaigns and API-triggered bulk sends, so that all mass sending benefits from the same protections.

#### Acceptance Criteria

1. WHEN messages are created via the public API with the same destination batch THEN the system SHALL apply the same throttling rules as campaigns
2. WHEN the API rate limiter allows a request THEN the Campaign_Dispatcher throttling SHALL still apply at the device level
3. WHEN a message is marked as high priority THEN the system SHALL process it before normal priority messages while still respecting device throttle rates
