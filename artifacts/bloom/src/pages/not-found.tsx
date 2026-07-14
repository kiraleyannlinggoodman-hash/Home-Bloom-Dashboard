import { AppLayout } from "@/components/layout"
import { Compass } from "lucide-react"

export default function NotFound() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-primary mb-6">
          <Compass className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-serif mb-2">Page not found</h1>
        <p className="text-muted-foreground text-lg">
          You've wandered off the path. Let's head back home.
        </p>
      </div>
    </AppLayout>
  )
}
