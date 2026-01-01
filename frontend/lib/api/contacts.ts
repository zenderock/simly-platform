import api from "../api";

export interface Contact {
  id: number;
  organization_id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ContactList {
  id: number;
  organization_id: number;
  name: string;
  description: string;
  created_at: string;
  member_count?: number;
}

export interface CreateContactRequest {
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  tags: string[];
}

export interface CreateListRequest {
  name: string;
  description: string;
}

export async function listContacts() {
  const { data } = await api.get<Contact[]>("/contacts");
  return data;
}

export async function createContact(data: CreateContactRequest) {
  const { data: contact } = await api.post<Contact>("/contacts", data);
  return contact;
}

export async function updateContact(id: number, data: CreateContactRequest) {
  const { data: contact } = await api.put<Contact>(`/contacts/${id}`, data);
  return contact;
}

export async function deleteContact(id: number) {
  await api.delete(`/contacts/${id}`);
}

export async function listLists() {
  const { data } = await api.get<ContactList[]>("/contact-lists");
  return data;
}

export async function createList(data: CreateListRequest) {
  const { data: list } = await api.post<ContactList>("/contact-lists", data);
  return list;
}

export async function deleteList(id: number) {
  await api.delete(`/contact-lists/${id}`);
}

export async function getListDetails(id: number) {
  const { data } = await api.get<{ list: ContactList; members: Contact[] }>(`/contact-lists/${id}`);
  return data;
}

export async function addContactsToList(listId: number, contactIds: number[]) {
  await api.post(`/contact-lists/${listId}/members`, { contact_ids: contactIds });
}

export async function removeContactFromList(listId: number, memberId: number) {
  await api.delete(`/contact-lists/${listId}/members/${memberId}`);
}
