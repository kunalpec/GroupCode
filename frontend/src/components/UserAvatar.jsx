import { useMemo, useState } from "react";
import { getAvatarUrl, getInitials } from "../lib/avatar";
import { cn } from "../lib/utils";

function UserAvatar({ user, name, className, fallbackClassName = "", imageClassName = "", ringColor = "" }) {
  const [failed, setFailed] = useState(false);
  const resolvedName = name || user?.name || "User";
  const avatarUrl = useMemo(() => getAvatarUrl(user), [user]);
  const shouldShowImage = avatarUrl && !failed;
  const ringStyle = ringColor
    ? {
        boxShadow: `0 0 0 2px ${ringColor}`,
      }
    : undefined;

  if (shouldShowImage) {
    return (
      <div className={cn("rounded-full", className)} style={ringStyle}>
        <img
          alt={resolvedName}
          className={cn("h-full w-full rounded-full object-cover", imageClassName)}
          onError={() => setFailed(true)}
          src={avatarUrl}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-[#1f3b5b] font-semibold text-[#dbeafe]",
        "rounded-full",
        className,
        fallbackClassName,
      )}
      style={ringStyle}
    >
      {getInitials(resolvedName)}
    </div>
  );
}

export default UserAvatar;
