import { redirect } from 'next/navigation'

// Root redirects to /login; middleware handles the rest
export default function Home() {
  redirect('/login')
}
