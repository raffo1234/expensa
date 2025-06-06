import { UUIDTypes } from "uuid";
import { TemplateType } from "./templateType";

type RoleType = {
  id: string;
  name: string;
};

export type UserType = {
  id: string;
  first_name?: string;
  last_name?: string;
  image_url: string;
  username: string;
  email: string;
  role_id?: string;
  role?: RoleType;
  template_id?: UUIDTypes;
  template?: TemplateType;
  supervisor_user_id?: string | null;
};
