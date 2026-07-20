export function getInitials(user) {
  const firstName = user?.firstName?.trim() ?? "";
  const lastName = user?.lastName?.trim() ?? "";

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return initials || "U";
}
