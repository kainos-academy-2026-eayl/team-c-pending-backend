import prisma from '../src/prismaClient';
import 'dotenv/config';

await prisma.product.createMany({
  data: [
    {
      name: 'OxyFlow Home Dispenser',
      description:
        'Compact oxygen dispensing unit designed for home use with adjustable flow settings.',
      price: 2000,
      quantity: 10,
      category: 'Dispenser',
      image: '/images/homeDispenser.jpg',
    },
    {
      name: 'OxyFlow Pro Dispenser',
      description:
        'Professional-grade oxygen dispenser offering precise flow control and digital monitoring.',
      price: 2500,
      quantity: 15,
      category: 'Dispenser',
      image: '/images/proDispenser.jpg',
    },
    {
      name: 'OxyFlow Mini Dispenser',
      description:
        'Lightweight dispenser ideal for personal oxygen therapy and small spaces.',
      price: 1800,
      quantity: 12,
      category: 'Dispenser',
      image: '/images/miniDispenser.jpg',
    },
    {
      name: 'PureAir Oxygen Tank 5L',
      description:
        'Durable 5-litre oxygen tank suitable for short-term oxygen supply needs.',
      price: 1000,
      quantity: 9,
      category: 'Tanks',
      image: '/images/5LTank.jpg',
    },
    {
      name: 'PureAir Oxygen Tank 10L',
      description:
        'High-capacity oxygen tank designed for extended oxygen delivery.',
      price: 1500,
      quantity: 14,
      category: 'Tanks',
      image: '/images/10LTank.jpg',
    },
    {
      name: 'PureAir Emergency Tank',
      description:
        'Portable emergency oxygen tank for backup oxygen support, perfect for any zombie apocalypse scenario.',
      price: 1750,
      quantity: 7,
      category: 'Tanks',
      image: '/images/emergencyTank.jpg',
    },
    {
      name: 'PureAir Lightweight Tank',
      description:
        'Lightweight aluminium oxygen tank for easier transport and storage.',
      price: 1400,
      quantity: 11,
      category: 'Tanks',
      image: '/images/lightweightTank.jpg',
    },
    {
      name: 'OxyGo Portable 1',
      description:
        'Portable oxygen concentrator with rechargeable battery and carry case.',
      price: 500,
      quantity: 6,
      category: 'Portable',
      image: '/images/portable1.jpeg',
    },
    {
      name: 'OxyGo Portable Plus',
      description:
        'Advanced portable oxygen concentrator with extended battery life.',
      price: 600,
      quantity: 5,
      category: 'Portable',
      image: '/images/portablePlus.png',
    },
    {
      name: 'OxyGo Travel Companion',
      description:
        'Travel-friendly oxygen concentrator approved for use during journeys.',
      price: 1500,
      quantity: 10,
      category: 'Portable',
      image: '/images/travel.jpg',
    },
    {
      name: 'OxyGo Compact',
      description:
        'Compact oxygen delivery system designed for active lifestyles.',
      price: 3800,
      quantity: 8,
      category: 'Portable',
      image: '/images/compact.jpg',
    },
    {
      name: 'BreathEasy Adult Mask',
      description: 'Comfortable oxygen mask designed for adult oxygen therapy.',
      price: 600,
      quantity: 9,
      category: 'Masks',
      image: '/images/mask.jpg',
    },
    {
      name: 'BreathEasy Child Mask',
      description:
        'Soft and lightweight oxygen mask suitable for younger users.',
      price: 600,
      quantity: 13,
      category: 'Masks',
      image: '/images/mask.jpg',
    },
    {
      name: 'BreathEasy Premium Mask',
      description:
        'Premium oxygen mask with enhanced comfort and adjustable straps.',
      price: 1000,
      quantity: 7,
      category: 'Masks',
      image: '/images/premiumMask.jpg',
    },
    {
      name: 'BreathEasy Vent Mask',
      description:
        'Venturi-style oxygen mask offering controlled oxygen delivery.',
      price: 1000,
      quantity: 4,
      category: 'Masks',
      image: '/images/ventMask.jpg',
    },
    {
      name: 'OxyPure Refill Canister Small',
      description:
        'Small replacement oxygen refill canister for compatible systems.',
      price: 410,
      quantity: 6,
      category: 'Refils',
      image: '/images/compact.jpg',
    },
    {
      name: 'OxyPure Refill Canister Medium',
      description: 'Medium-sized oxygen refill canister for everyday use.',
      price: 1000,
      quantity: 12,
      category: 'Refils',
      image: '/images/5lTank.jpg',
    },
    {
      name: 'OxyPure Refill Canister Large',
      description:
        'Large-capacity oxygen refill canister designed for extended sessions.',
      price: 5750,
      quantity: 5,
      category: 'Refils',
      image: '/images/10lTank.jpg',
    },
    {
      name: 'OxyPure Travel Refill',
      description:
        'Portable oxygen refill canister ideal for use while traveling.',
      price: 1800,
      quantity: 16,
      category: 'Refils',
      image: '/images/travel.jpg',
    },
    {
      name: 'OxyPure Emergency Refill',
      description:
        'Quick-connect emergency oxygen refill canister for backup supply.',
      price: 6250,
      quantity: 3,
      category: 'Refils',
      image: '/images/emergencyRefill.jpg',
    },
    {
      name: 'Iron Lung',
      description:
        'For those times when you forget to breathe, you can have a negitive pressure ventilator at your disposal.',
      price: 10000,
      quantity: 2,
      category: 'Ventilators',
      image: '/images/IronLung.jpg',
    }
  ],
});
