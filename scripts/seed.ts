import prisma from '../src/prismaClient';
import 'dotenv/config';

await prisma.product.createMany({
  data: [
    {
      name: 'Groundskeeping Hat',
      price: 19.99,
      description: 'A hat for groundskeeping purposes.',
      image:
        'https://digitalcontent.api.tesco.com/v2/media/marketplace/ce540729-7977-411b-bee7-e3aa69681ce0/wcgmZR5vODj0Q6-lu9_-MYKPM_1474349189.jpeg',
      category: 'Equipment',
      quantity: 20,
    },
    {
      name: 'Gardening Gloves',
      price: 9.99,
      description: 'Durable gloves for gardening.',
      image:
        'https://thumbs.dreamstime.com/b/farmer-hand-wearing-glove-catches-mole-garden-metal-trap-pest-control-concept-shows-soil-gardening-farming-agriculture-387844826.jpg',
      category: 'Equipment',
      quantity: 50,
    },
    {
      name: 'Anti-mole Spray',
      price: 14.99,
      description: 'Spray to repel moles from your garden.',
      image:
        'https://media.diy.com/is/image/KingfisherDigital/stay-off-mole-repellent-500g-bottle~5012042191146_01c_MP?$MOB_PREV$&$width=1200&$height=1200',
      category: 'Mole Control',
      quantity: 30,
    },
    {
      name: 'Whack-a-Mole Mallet',
      price: 24.99,
      description: 'A mallet for whacking moles.',
      image: 'https://m.media-amazon.com/images/I/61jR4gwcYSL.jpg',
      category: 'Mole Control',
      quantity: 15,
    },
    {
      name: 'Golden Mallet',
      price: 49.99,
      description: 'A premium mallet for whacking moles.',
      image:
        'https://static.vecteezy.com/system/resources/previews/055/471/732/non_2x/3d-golden-hammer-with-a-metallic-head-and-wooden-handle-on-transparent-background-free-png.png',
      category: 'Mole Control',
      quantity: 5,
    },
    {
      name: 'Catching Moles: The History and Practice',
      price: 29.99,
      description: 'A comprehensive guide to catching moles.',
      image:
        'https://m.media-amazon.com/images/I/81TngOIVC0L._UF1000,1000_QL80_.jpg',
      category: 'Books',
      quantity: 10,
    },
    {
      name: 'Decoy Mole',
      price: 19.99,
      description: 'A realistic decoy mole to attract real moles.',
      image:
        'https://charliebears.co.uk/product_images/uploaded_images/mula-mole.png',
      category: 'Mole Control',
      quantity: 25,
    },
    {
      name: 'Mole Bait',
      price: 12.99,
      description: 'Bait to attract moles.',
      image:
        'https://www.gourmetsweets.co.uk/cdn/shop/files/MulticolourGummyWorms.jpg?v=1779736873',
      category: 'Mole Control',
      quantity: 40,
    },
    {
      name: 'Taskmaster Hint',
      price: 800,
      description: 'A hint from the Taskmaster.',
      image:
        'https://media.licdn.com/dms/image/v2/D4E03AQGu0Ui5lnYT_g/profile-displayphoto-scale_200_200/B4EaAgfIBVHEAc-/0/1787251425952?e=2147483647&v=beta&t=sxYGOIrl15KGT8lcZ_OWKFIweU0FyrUTR6JpLNHWuQs',
      category: 'Taskmaster',
      quantity: 5,
    },
    {
      name: 'Mole enclosure',
      price: 199.99,
      description: 'A secure enclosure to keep moles contained.',
      image:
        'https://m.media-amazon.com/images/I/71PNykn4fEL._AC_UF1000,1000_QL80_.jpg',
      category: 'Mole Control',
      quantity: 10,
    },
    {
      name: 'German Mole Cake',
      price: 19.99,
      description: 'A delicious German mole cake.',
      image:
        'https://baketotheroots.de/wp-content/uploads/2021/05/SQ_210215_Maulwurfkuchen-mit-Bananen.jpg',
      category: 'Food',
      quantity: 20,
    },
    {
      name: 'Shovel',
      price: 14.99,
      description: 'A sturdy shovel for digging up moles.',
      image: 'https://i.ebayimg.com/images/g/3OAAAOSwOCdh-BUm/s-l400.jpg',
      category: 'Equipment',
      quantity: 30,
    },
  ],
});
