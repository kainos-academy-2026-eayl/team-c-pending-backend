import prisma from '../src/prismaClient';
import 'dotenv/config';

await prisma.product.createMany({
  data: [
    {
      name: 'Apple',
      description: 'A juicy red apple',
      price: 0.5,
      quantity: 10,
      category: 'Fruit',
      image:
        'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Banana',
      description: 'A ripe yellow banana',
      price: 0.3,
      quantity: 15,
      category: 'Fruit',
      image:
        'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Orange',
      description: 'A sweet, juicy orange',
      price: 0.65,
      quantity: 12,
      category: 'Fruit',
      image:
        'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Strawberries',
      description: 'Fresh, ripe strawberries',
      price: 3.5,
      quantity: 8,
      category: 'Fruit',
      image:
        'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Avocado',
      description: 'A creamy, ripe avocado',
      price: 1.2,
      quantity: 9,
      category: 'Fruit',
      image:
        'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Carrots',
      description: 'A bunch of crisp carrots',
      price: 1.1,
      quantity: 14,
      category: 'Vegetables',
      image:
        'https://images.unsplash.com/photo-1445282768818-728615cc910a?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Broccoli',
      description: 'A fresh head of broccoli',
      price: 1.75,
      quantity: 7,
      category: 'Vegetables',
      image:
        'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Potatoes',
      description: 'A bag of versatile potatoes',
      price: 2.4,
      quantity: 11,
      category: 'Vegetables',
      image:
        'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Spinach',
      description: 'A bag of tender baby spinach',
      price: 2.25,
      quantity: 6,
      category: 'Vegetables',
      image:
        'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Sourdough Bread',
      description: 'A crusty loaf of sourdough bread',
      price: 4.25,
      quantity: 5,
      category: 'Bakery',
      image:
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Croissant',
      description: 'A buttery, flaky croissant',
      price: 1.5,
      quantity: 10,
      category: 'Bakery',
      image:
        'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Cheddar Cheese',
      description: 'A block of mature cheddar cheese',
      price: 3.8,
      quantity: 8,
      category: 'Dairy',
      image:
        'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Greek Yogurt',
      description: 'Creamy plain Greek yogurt',
      price: 2.9,
      quantity: 9,
      category: 'Dairy',
      image:
        'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Oat Milk',
      description: 'A carton of smooth oat milk',
      price: 2.6,
      quantity: 13,
      category: 'Dairy',
      image:
        'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Orange Juice',
      description: 'Fresh-tasting orange juice',
      price: 3.25,
      quantity: 7,
      category: 'Beverages',
      image:
        'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Ground Coffee',
      description: 'Medium-roast ground coffee',
      price: 7.5,
      quantity: 4,
      category: 'Beverages',
      image:
        'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Green Tea',
      description: 'A box of refreshing green tea bags',
      price: 4.1,
      quantity: 6,
      category: 'Beverages',
      image:
        'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Dark Chocolate',
      description: 'A rich dark chocolate bar',
      price: 2.2,
      quantity: 12,
      category: 'Snacks',
      image:
        'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Almonds',
      description: 'A bag of roasted almonds',
      price: 5.75,
      quantity: 5,
      category: 'Snacks',
      image:
        'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Potato Chips',
      description: 'Crunchy salted potato chips',
      price: 1.8,
      quantity: 16,
      category: 'Snacks',
      image:
        'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Honey',
      description: 'A jar of natural wildflower honey',
      price: 6.25,
      quantity: 3,
      category: 'Pantry',
      image:
        'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=512&h=512&q=80',
    },
    {
      name: 'Olive Oil',
      description: 'Extra virgin olive oil',
      price: 8.9,
      quantity: 4,
      category: 'Pantry',
      image:
        'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=512&h=512&q=80',
    },
  ],
});
