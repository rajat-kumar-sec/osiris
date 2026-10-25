import type { Metadata } from "next";
import OsirisApp from "@/components/OsirisApp";

export const metadata: Metadata = {
  title: "OSIRIS — Global Intelligence Platform",
  description:
    "Live aircraft, vessels, satellites, CCTV, hazards, cyber threats and a full OSINT reconnaissance suite on a 3D globe.",
};

export default function Page() {
  return <OsirisApp />;
}
