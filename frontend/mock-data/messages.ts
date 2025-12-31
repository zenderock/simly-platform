export interface Message {
  id: string;
  recipient: string;
  sender: string;
  content: string;
  status: "Sent" | "Delivered" | "Failed" | "Pending";
  app: string;
  device: string;
  createdAt: string;
}

const statuses: Message["status"][] = ["Sent", "Delivered", "Failed", "Pending"];
const apps = ["Production Auth", "Sandbox Test", "E-commerce Bot", "Marketing Alert"];
const devices = ["Pixel 7 Pro #1", "Pixel 7 Pro #2", "Galaxy S21 #1", "Nokia Gateway"];

const messageTemplates = [
  { recipient: "+33 6 12 34 56 78", content: "Votre code de vérification est 482910." },
  { recipient: "+33 7 89 01 23 45", content: "Votre commande #9281 est en cours de livraison." },
  { recipient: "+44 20 7946 0958", content: "Alerte: Température critique détectée dans le serveur A12." },
  { recipient: "+33 6 44 55 66 77", content: "Votre rendez-vous est confirmé pour demain à 14h30." },
  { recipient: "+212 6 11 22 33 44", content: "Profitez de -20% sur votre prochaine commande avec le code PROMO20." },
];

function getRandomDate(): string {
  const now = new Date();
  const past = new Date(now.getTime() - Math.random() * 1000 * 60 * 60 * 24 * 7); // Last 7 days
  return past.toISOString();
}

export const messages: Message[] = Array.from({ length: 50 }).map((_, index) => {
  const template = messageTemplates[index % messageTemplates.length];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const app = apps[index % apps.length];
  const device = devices[index % devices.length];

  return {
    id: (index + 1).toString(),
    recipient: template.recipient,
    sender: "+33695040302",
    content: template.content,
    status,
    app,
    device,
    createdAt: getRandomDate(),
  };
});
