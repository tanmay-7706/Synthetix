import React from "react";

const AuthLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <div className="flex min-h-screen items-center justify-center py-12">
      {children}
    </div>
  );
};

export default AuthLayout;
