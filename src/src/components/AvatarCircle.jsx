import { User as UserIcon } from "lucide-react";
import { avatarUrl } from "../lib/supabase";

export default function AvatarCircle({ record, size = 12 }) {
  const url = record?.avatar ? avatarUrl(record.avatar) : null;
  const px = size * 4; // tailwind size scale -> px (ex: size=12 -> w-12/h-12 -> 48px)
  return (
    <div
      className="rounded-full bg-ocre-500/10 text-ocre-500 flex items-center justify-center overflow-hidden shrink-0"
      style={{ width: px, height: px }}
    >
      {url ? (
        <img src={url} alt={record?.nom || "avatar"} className="w-full h-full object-cover" />
      ) : (
        <UserIcon style={{ width: px * 0.5, height: px * 0.5 }} strokeWidth={1.75} />
      )}
    </div>
  );
}
