import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/dashboard';
import Planner from '@/pages/planner';
import Subjects from '@/pages/subjects';
import SubjectWorkspace from '@/pages/subject-workspace';
import FocusTracker from '@/pages/focus';
import { Route, Switch, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/planner" component={Planner} />
      <Route path="/subjects" component={Subjects} />
      <Route path="/subjects/:id">
        {(params) => <SubjectWorkspace id={Number(params.id)} />}
      </Route>
      <Route path="/focus" component={FocusTracker} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
