import { Outlet } from 'react-router';
import { UpdateNotice } from './UpdateNotice';

/** Every page, with the update notice over it. */
export function AppShell() {
  return (
    <>
      <Outlet />
      <UpdateNotice />
    </>
  );
}
