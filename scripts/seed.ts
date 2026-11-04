import prisma from '../src/prismaClient';
import 'dotenv/config';

await prisma.product.createMany({
  data: [
    {
      name: 'OxyFlow Home Dispenser',
      description: 'Compact oxygen dispensing unit designed for home use with adjustable flow settings.',
      price: 0.5,
      quantity: 10,
      category: 'Dispenser',
      image:
        'https://prashanthihomecarelabsanddiagnostics.com/wp-content/uploads/2026/04/Oxygen-Concentrator.webp',
    },
    {
      name: 'OxyFlow Pro Dispenser',
      description: 'Professional-grade oxygen dispenser offering precise flow control and digital monitoring.',
      price: 0.3,
      quantity: 15,
      category: 'Dispenser',
      image:
        'https://image.made-in-china.com/2f0j00aCoqfnvkETcm/Medical-Equipment-5-Liter-Oxygen-Concentrator-for-Hospital-with-93-High-Purity-Produce-Oxygen.jpg',
    },
    {
      name: 'OxyFlow Mini Dispenser',
      description: 'Lightweight dispenser ideal for personal oxygen therapy and small spaces.',
      price: 0.65,
      quantity: 12,
      category: 'Dispenser',
      image:
        'https://image.made-in-china.com/2f0j00nUFbPSOIQekv/Medical-Equipment-3-Liter-Portable-Oxygen-Concentrator-with-93-High-Purity-Hospital-Equipment.jpg',
    },
    {
      name: 'PureAir Oxygen Tank 5L',
      description: 'Durable 5-litre oxygen tank suitable for short-term oxygen supply needs.',
      price: 1.2,
      quantity: 9,
      category: 'Tanks',
      image:
        'https://www.shutterstock.com/image-photo/hospital-medical-gas-oxygen-flowmeter-concentrator-260nw-2468254537.jpg',
    },
    {
      name: 'PureAir Oxygen Tank 10L',
      description: 'High-capacity oxygen tank designed for extended oxygen delivery.',
      price: 1.1,
      quantity: 14,
      category: 'Tanks',
      image:
        'https://www.shutterstock.com/image-photo/oxygen-supply-regulation-valve-hospital-room-260nw-2468254529.jpg',
    },
    {
      name: 'PureAir Emergency Tank',
      description: 'Portable emergency oxygen tank for backup oxygen support.',
      price: 1.75,
      quantity: 7,
      category: 'Tanks',
      image:
        'https://www.shutterstock.com/image-photo/set-icon-oxygen-tank-260nw-2474183821.jpg',
    },
    {
      name: 'PureAir Lightweight Tank',
      description: 'Lightweight aluminium oxygen tank for easier transport and storage.',
      price: 2.4,
      quantity: 11,
      category: 'Tanks',
      image:
        'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'OxyGo Portable 1',
      description: 'Portable oxygen concentrator with rechargeable battery and carry case.',
      price: 2.25,
      quantity: 6,
      category: 'Portable',
      image:
        'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'OxyGo Portable Plus',
      description: 'Advanced portable oxygen concentrator with extended battery life.',
      price: 4.25,
      quantity: 5,
      category: 'Portable',
      image:
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'OxyGo Travel Companion',
      description: 'Travel-friendly oxygen concentrator approved for use during journeys.',
      price: 1.5,
      quantity: 10,
      category: 'Portable',
      image:
        'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'OxyGo Compact',
      description: 'Compact oxygen delivery system designed for active lifestyles.',
      price: 3.8,
      quantity: 8,
      category: 'Portable',
      image:
        'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'BreathEasy Adult Mask',
      description: 'Comfortable oxygen mask designed for adult oxygen therapy.',
      price: 2.9,
      quantity: 9,
      category: 'Masks',
      image:
        'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'BreathEasy Child Mask',
      description: 'Soft and lightweight oxygen mask suitable for younger users.',
      price: 2.6,
      quantity: 13,
      category: 'Masks',
      image:
        'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'BreathEasy Premium Mask',
      description: 'Premium oxygen mask with enhanced comfort and adjustable straps.',
      price: 3.25,
      quantity: 7,
      category: 'Masks',
      image:
        'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'BreathEasy Vent Mask',
      description: 'Venturi-style oxygen mask offering controlled oxygen delivery.',
      price: 7.5,
      quantity: 4,
      category: 'Masks',
      image:
        'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'OxyPure Refill Canister Small',
      description: 'Small replacement oxygen refill canister for compatible systems.',
      price: 4.1,
      quantity: 6,
      category: 'Refils',
      image:
        'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'OxyPure Refill Canister Medium',
      description: 'Medium-sized oxygen refill canister for everyday use.',
      price: 2.2,
      quantity: 12,
      category: 'Refils',
      image:
        'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'OxyPure Refill Canister Large',
      description: 'Large-capacity oxygen refill canister designed for extended sessions.',
      price: 5.75,
      quantity: 5,
      category: 'Refils',
      image:
        'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'OxyPure Travel Refill',
      description: 'Portable oxygen refill canister ideal for use while traveling.',
      price: 1.8,
      quantity: 16,
      category: 'Refils',
      image:
        'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'OxyPure Emergency Refill',
      description: 'Quick-connect emergency oxygen refill canister for backup supply.',
      price: 6.25,
      quantity: 3,
      category: 'Refils',
      image:
        'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=512&h=512&q=80',
    },
  ],
});
