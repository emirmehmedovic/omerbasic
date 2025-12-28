#!/usr/bin/env tsx
/**
 * Link Spareto Images Script
 *
 * Copies images from spareto_images/ folder to public/uploads/
 * and links them to products by SKU (only for products without images).
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Paths
const SOURCE_DIR = path.join(process.cwd(), 'spareto_images');
const TARGET_DIR = path.join(process.cwd(), 'public', 'uploads', 'products');

interface ProcessStats {
  totalImages: number;
  copied: number;
  linked: number;
  skipped: number;
  errors: number;
}

async function main() {
  console.log('🖼️  Spareto Image Linker\n');
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Target: ${TARGET_DIR}`);
  console.log('─'.repeat(70));

  // Ensure target directory exists
  if (!fs.existsSync(TARGET_DIR)) {
    console.log('\n📁 Creating uploads directory...');
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  // Read all images from source directory
  console.log('\n🔍 Reading images...');
  const allFiles = fs.readdirSync(SOURCE_DIR);

  // Filter only _1.jpg files (first image of each product)
  const firstImages = allFiles.filter(file =>
    file.endsWith('_1.jpg') || file.endsWith('_1.png') || file.endsWith('_1.webp')
  );

  console.log(`   Found ${allFiles.length} total images`);
  console.log(`   Found ${firstImages.length} primary images (_1.jpg/png/webp)`);

  if (firstImages.length === 0) {
    console.log('\n❌ No images found in source directory!');
    return;
  }

  const stats: ProcessStats = {
    totalImages: firstImages.length,
    copied: 0,
    linked: 0,
    skipped: 0,
    errors: 0
  };

  console.log('\n📦 Processing images...\n');

  for (const imageFile of firstImages) {
    try {
      // Extract SKU from filename (e.g., "55423_1.jpg" -> "55423")
      const sku = imageFile.split('_')[0];

      // Find product by SKU
      const product = await prisma.product.findUnique({
        where: { sku },
        select: { id: true, sku: true, name: true, imageUrl: true }
      });

      if (!product) {
        console.log(`⚠️  [${sku}] Product not found in database`);
        stats.skipped++;
        continue;
      }

      // Skip if product already has an image
      if (product.imageUrl) {
        console.log(`⏭️  [${sku}] Already has image: ${product.imageUrl}`);
        stats.skipped++;
        continue;
      }

      // Copy image to target directory
      const sourcePath = path.join(SOURCE_DIR, imageFile);
      const targetPath = path.join(TARGET_DIR, imageFile);

      fs.copyFileSync(sourcePath, targetPath);
      stats.copied++;

      // Update product with image URL
      const imageUrl = `/uploads/products/${imageFile}`;

      await prisma.product.update({
        where: { id: product.id },
        data: {
          imageUrl,
          updatedAt: new Date()
        }
      });

      stats.linked++;
      console.log(`✅ [${sku}] ${product.name.substring(0, 40)}... -> ${imageUrl}`);

    } catch (error) {
      stats.errors++;
      console.error(`❌ Error processing ${imageFile}:`, error instanceof Error ? error.message : error);
    }
  }

  // Final summary
  console.log('\n' + '═'.repeat(70));
  console.log('SUMMARY');
  console.log('═'.repeat(70));
  console.log(`Total images found:     ${stats.totalImages}`);
  console.log(`✅ Images copied:        ${stats.copied}`);
  console.log(`✅ Products linked:      ${stats.linked}`);
  console.log(`⏭️  Skipped:              ${stats.skipped}`);
  console.log(`❌ Errors:               ${stats.errors}`);
  console.log('═'.repeat(70));

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
