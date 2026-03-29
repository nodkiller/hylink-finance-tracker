/**
 * Layout for the magic link view page.
 * This page should be accessible without login and display without the sidebar.
 *
 * When a logged-in user visits this page, the root layout will render the sidebar.
 * This layout overrides the styling to fill the viewport and visually hide the sidebar.
 * When a non-logged-in user visits, the root layout already skips the sidebar.
 */
export default function AccountingViewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f8fafc]">
      {children}
    </div>
  )
}
