import AdBookingClient from './AdBookingClient';

export async function generateStaticParams() {
    return [
        { type: 'top' },
        { type: 'bottom' },
        { type: 'newsletter' },
    ];
}

export default function AdBookingPage() {
    return <AdBookingClient />;
}
