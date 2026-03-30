import { Globe2, PawPrint, Flag, Banknote, Flower2, Trophy, Landmark, Map } from "lucide-react";

export default function BackgroundPattern() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none opacity-[0.03] dark:opacity-[0.05]">
      {/* Top Left */}
      <Globe2 className="absolute top-10 left-10 w-64 h-64 -rotate-12" />
      
      {/* Top Right */}
      <Landmark className="absolute top-20 -right-10 w-72 h-72 rotate-12" />
      
      {/* Middle Left */}
      <PawPrint className="absolute top-1/3 -left-20 w-80 h-80 rotate-45" />
      
      {/* Middle Right */}
      <Flag className="absolute top-1/2 -right-16 w-64 h-64 -rotate-12" />
      
      {/* Bottom Left */}
      <Banknote className="absolute -bottom-10 left-20 w-72 h-72 -rotate-12" />
      
      {/* Bottom Right */}
      <Flower2 className="absolute -bottom-20 right-20 w-80 h-80 rotate-12" />
      
      {/* Center Background */}
      <Map className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-50" />
      
      {/* Extra floating elements */}
      <Trophy className="absolute top-3/4 left-1/3 w-48 h-48 rotate-12" />
    </div>
  );
}
