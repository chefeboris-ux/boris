export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SELLER = 'SELLER'
}

export enum SaleStatus {
  DRAFT = 'RASCUNHO',
  IN_PROGRESS = 'EM_ANDAMENTO',
  ANALYZED = 'ANALISADA',
  FINISHED = 'FINALIZADA'
}

export enum AppPermission {
  ACCESS_ADMIN_PANEL = 'ACCESS_ADMIN_PANEL',
  VIEW_ALL_SALES = 'VIEW_ALL_SALES',
  VIEW_OWN_SALES = 'VIEW_OWN_SALES',
  CREATE_SALES = 'CREATE_SALES',
  APPROVE_SALES = 'APPROVE_SALES',
  DELETE_USERS = 'DELETE_USERS',
  MANAGE_PERMISSIONS = 'MANAGE_PERMISSIONS'
}

export type RolePermissionsMap = Record<UserRole, AppPermission[]>;

export interface StatusHistoryEntry {
  status: SaleStatus;
  updatedBy: string;
  updatedAt: string;
  reason?: string; // Motivo opcional na entrada do histórico
}

export interface CustomerData {
  nome: string;
  cpf: string;
  data_nascimento: string;
  nome_mae: string;
  contato: string;
  email: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  plano: string;
  vencimento_dia: number;
  anotacoes?: string;
  audio_url?: string;
  foto_frente_url?: string;
  foto_verso_url?: string;
  foto_ctps_url?: string;
  foto_comprovante_residencia_url?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  confirmed: boolean;
  createdAt: string;
}

export interface Sale {
  id: string;
  sellerId: string;
  sellerName: string;
  customerData: CustomerData;
  status: SaleStatus;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  expiresAt?: number;
  returnReason?: string; // Justificativa de retorno para correção
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  timestamp: Date;
}