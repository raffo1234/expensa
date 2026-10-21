import { getUserById } from "@/actions/admin";

const userFetcher = (userId: string) => getUserById(userId);

export default userFetcher;
