import { redirect } from "next/navigation";

// Bazar səhifəsi /elanlar-a köçdü (tap.az üslubu URL-lər: /elanlar/elektronika/audio-video).
export default function MarketplaceRedirect() {
  redirect("/elanlar");
}
