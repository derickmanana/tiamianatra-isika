import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/partenaire/messages")({
  component: PartnerMessages,
});

function PartnerMessages() {
  return (
    <Card className="p-6 text-center">
      <MessageSquare className="h-10 w-10 mx-auto text-primary mb-2" />
      <h2 className="text-lg font-semibold mb-1">Messagerie</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Consultez vos messages avec l'administrateur et les étudiants.
      </p>
      <Link to="/messages">
        <Button>Ouvrir la messagerie <ArrowRight className="h-4 w-4 ml-1" /></Button>
      </Link>
    </Card>
  );
}
