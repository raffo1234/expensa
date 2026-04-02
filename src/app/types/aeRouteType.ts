export type AeRouteType = {
  id: string;
  hospital_id: string;
  ae_title: string;
  host: string;
  port: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  hospital?: {
    id: string;
    name: string;
    ae_title: string;
  };
};
