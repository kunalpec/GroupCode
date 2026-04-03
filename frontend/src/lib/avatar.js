export function getAvatarUrl(user) {
  if (!user) return "";

  if (typeof user.avatar === "string" && user.avatar) {
    return user.avatar;
  }

  if (user.avatar?.url) {
    return user.avatar.url;
  }

  if (user.oauthImage) {
    return user.oauthImage;
  }

  return "";
}

export function getInitials(name = "User") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}
