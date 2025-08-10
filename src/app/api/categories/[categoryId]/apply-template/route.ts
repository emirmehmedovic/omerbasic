import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Definicija tipova za atribute predloška
interface TemplateAttribute {
  name: string;
  label: string;
  type: string;
  unit?: string | null;
  options?: string[] | null;
  isRequired?: boolean;
  isFilterable?: boolean;
  groupName?: string;
  sortOrder?: number;
  attributeGroupId?: string | null;
  isComparable?: boolean;
  validationRules?: any;
  supportedUnits?: string[];
  categoryId?: string;
  groupId?: string | null;
}

// Schema za validaciju zahtjeva za primjenu predloška
const applyTemplateSchema = z.object({
  templateId: z.string().min(1, "ID predloška je obavezan"),
});

// POST - Primjena predloška atributa na kategoriju
export async function POST(
  req: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    // Dohvaćamo categoryId iz params (async)
    const { categoryId } = await params;
    const body = await req.json();
    
    // Validacija podataka
    const validatedData = applyTemplateSchema.parse(body);
    
    // Provjera da li kategorija postoji
    const category = await db.category.findUnique({
      where: { id: categoryId },
    });
    
    if (!category) {
      return NextResponse.json(
        { error: "Kategorija nije pronađena" },
        { status: 404 }
      );
    }
    
    // Dohvat predloška
    const template = await db.attributeTemplate.findUnique({
      where: { id: validatedData.templateId },
    });
    
    if (!template) {
      return NextResponse.json(
        { error: "Predložak nije pronađen" },
        { status: 404 }
      );
    }
    
    // Parsiranje atributa iz predloška
    const templateAttributes = (template.attributes as unknown) as TemplateAttribute[];
    
    // Kreiranje grupa atributa ako ne postoje
    const groupsMap = new Map<string, string>();
    const attributesToCreate: TemplateAttribute[] = [];
    
    // Grupiranje atributa po grupama
    const attributesByGroup = templateAttributes.reduce((acc, attr) => {
      const groupName = attr.groupName || 'default';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(attr);
      return acc;
    }, {} as Record<string, TemplateAttribute[]>);
    
    // Kreiranje grupa i atributa
    for (const [groupName, attributes] of Object.entries(attributesByGroup)) {
      // Preskačemo default grupu
      if (groupName !== 'default') {
        // Provjera da li grupa već postoji
        let group = await db.attributeGroup.findFirst({
          where: {
            categoryId,
            name: groupName,
          },
        });
        
        // Ako grupa ne postoji, kreiramo je
        if (!group) {
          group = await db.attributeGroup.create({
            data: {
              name: groupName,
              label: groupName, // Koristimo isto ime kao oznaku
              categoryId,
              sortOrder: 0,
            },
          });
        }
        
        groupsMap.set(groupName, group.id);
      }
      
      // Priprema atributa za kreiranje
      for (const attr of attributes) {
        // Provjera da li atribut već postoji
        const existingAttr = await db.categoryAttribute.findFirst({
          where: {
            categoryId,
            name: attr.name,
          },
        });
        
        // Ako atribut ne postoji, dodajemo ga u listu za kreiranje
        if (!existingAttr) {
          attributesToCreate.push({
            name: attr.name,
            label: attr.label,
            type: attr.type,
            unit: attr.unit || null,
            options: attr.options || undefined,
            isRequired: attr.isRequired || false,
            isFilterable: attr.isFilterable || false,
            isComparable: attr.isComparable || false,
            sortOrder: attr.sortOrder || 0,
            categoryId,
            groupId: groupName !== 'default' ? groupsMap.get(groupName) : null,
            validationRules: attr.validationRules || null,
            supportedUnits: attr.supportedUnits || undefined,
          });
        }
      }
    }
    
    // Kreiranje atributa
    const createdAttributes = await Promise.all(
      attributesToCreate.map(attr => 
        db.categoryAttribute.create({
          data: {
            name: attr.name,
            label: attr.label,
            type: attr.type,
            unit: attr.unit || null,
            options: attr.options || undefined,
            isRequired: attr.isRequired || false,
            isFilterable: attr.isFilterable || false,
            isComparable: attr.isComparable || false,
            sortOrder: attr.sortOrder || 0,
            categoryId,
            groupId: attr.groupName && attr.groupName !== 'default' ? groupsMap.get(attr.groupName) : null,
            validationRules: attr.validationRules || null,
            supportedUnits: attr.supportedUnits || undefined,
            // Kategorija se povezuje kroz categoryId, ne trebamo connect
          }
        })
      )
    );
    
    return NextResponse.json({
      success: true,
      message: `Primijenjeno ${createdAttributes.length} atributa iz predloška`,
      createdAttributes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.format() },
        { status: 400 }
      );
    }
    
    console.error("Error applying attribute template:", error);
    return NextResponse.json(
      { error: "Greška prilikom primjene predloška atributa" },
      { status: 500 }
    );
  }
}
