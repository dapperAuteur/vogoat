import { permanentRedirect } from "next/navigation";

/** The collection is called the Guild now (BAM, 2026-09-02); old links keep working. */
export default function MenagerieRedirect() {
  permanentRedirect("/guild");
}
