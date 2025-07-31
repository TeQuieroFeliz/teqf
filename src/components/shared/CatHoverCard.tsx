import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card';

export function CatHoverCard({
  type,
  size,
  note,
  categoryName,
  children,
}: {
  type?: string;
  size?: string;
  note?: string;
  categoryName: string;
  children: React.ReactNode;
}) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{categoryName}</h4>
          <div className="flex items-center justify-between text-xs">
            {type && <span>Type: {type}</span>}
            {size && <span>Size: {size}</span>}
          </div>
          {note && (
            <p className="text-xs text-muted-foreground">Note: {note}</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
