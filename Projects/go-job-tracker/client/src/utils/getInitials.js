export function getInitials(user) {
  const firstName = user?.firstName?.trime() ?? "";
  const lastName = user?.lastName?.trime() ?? "";

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return initials || "U";
}
