import api from "../api";
import { Device } from "@/types";

export const listDevices = async (): Promise<Device[]> => {
  const { data } = await api.get<Device[]>("/devices");
  return data;
};

export const getDevice = async (id: number): Promise<Device> => {
  const { data } = await api.get<Device>(`/devices/${id}`);
  return data;
};

export const deleteDevice = async (id: number): Promise<void> => {
  await api.delete(`/devices/${id}`);
};

export const linkDevice = async (token: string): Promise<Device> => {
    const { data } = await api.post<Device>("/devices/link", { token });
    return data;
};
