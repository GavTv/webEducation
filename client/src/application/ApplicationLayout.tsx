import AuthSuccessToast from "@/features/auth/ui/AuthSuccessToast";

type ApplicationLayoutProps = {
  children: React.ReactNode;
};

export default function ApplicationLayout({
  children,
}: ApplicationLayoutProps) {
  return (
    <>
      {children}
      <AuthSuccessToast />
    </>
  );
}
