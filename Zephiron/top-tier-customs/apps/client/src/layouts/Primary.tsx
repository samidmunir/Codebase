import React from "react";

type PrimaryLayoutProps = {
  children: React.ReactNode;
};

const Primary: React.FC<PrimaryLayoutProps> = ({ children }) => {
  return (
    <>
      <main>{children}</main>
    </>
  );
};

export default Primary;
