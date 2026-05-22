import AuthSuccessToast from "@/features/auth/ui/AuthSuccessToast";
import { MobileProfileFloating } from "@/widgets/appShell/MobileProfileFloating";

type ApplicationLayoutProps = {
  children: React.ReactNode;
};

export default function ApplicationLayout({
  children,
}: ApplicationLayoutProps) {
  return (
    <>
      {children}
      <MobileProfileFloating />
      <AuthSuccessToast />
    </>
  );
}
