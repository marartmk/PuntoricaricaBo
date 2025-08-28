// src/utils/auth.ts
export function getCurrentSession() {
  const role = localStorage.getItem("userLevel") || "";
  const idUser = localStorage.getItem("idUser") || "";
  const idCompany = localStorage.getItem("IdCompany") || "";
  const token = localStorage.getItem("token") || "";

  return {
    isAdmin: role.toLowerCase() === "admin",
    role,
    idUser,
    idCompany,
    token,
  };
}

export function getAuthHeaders() {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Token mancante, effettua nuovamente il login.");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
