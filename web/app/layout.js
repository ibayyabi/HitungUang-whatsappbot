import './globals.css';

export const metadata = {
    title: 'HitungUang',
    description: 'Dashboard dan onboarding HitungUang.'
};

export default function RootLayout({ children }) {
    return (
        <html lang="id">
            <body>{children}</body>
        </html>
    );
}
