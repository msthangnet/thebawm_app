export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="py-8 bg-card border-t">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>&copy; {currentYear} The Bawm. All rights reserved.</p>
      </div>
    </footer>
  );
}
