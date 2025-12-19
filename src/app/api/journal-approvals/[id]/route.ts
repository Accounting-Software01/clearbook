
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src','data', 'journal-entries.json');

async function readJournalEntries() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    return [];
  }
}

async function writeJournalEntries(entries: any) {
  await fs.writeFile(dataFilePath, JSON.stringify(entries, null, 2));
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const { status } = await request.json();

  if (!status || !['posted', 'rejected'].includes(status)) {
    return new NextResponse('Invalid status', { status: 400 });
  }

  try {
    const entries = await readJournalEntries();
    const entryIndex = entries.findIndex((entry: any) => entry.id === parseInt(id));

    if (entryIndex === -1) {
      return new NextResponse('Entry not found', { status: 404 });
    }

    entries[entryIndex].status = status;
    await writeJournalEntries(entries);

    return NextResponse.json(entries[entryIndex]);
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
