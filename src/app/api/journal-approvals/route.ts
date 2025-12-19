
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src','data', 'journal-entries.json');

async function readJournalEntries() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    // If the file doesn't exist or is empty, return an empty array
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    const entries = await readJournalEntries();
    const filteredEntries = status ? entries.filter((entry: any) => entry.status === status) : entries;
    return NextResponse.json(filteredEntries);
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
