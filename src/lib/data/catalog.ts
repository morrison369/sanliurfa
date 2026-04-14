/**
 * Data Catalog Module
 * Stub implementation for data catalog
 */

export interface Dataset {
  id: string;
  name: string;
  description: string;
  schema: Record<string, string>;
  createdAt: Date;
}

export class DataCatalog {
  private datasets: Map<string, Dataset> = new Map();

  register(dataset: Omit<Dataset, 'id' | 'createdAt'>): Dataset {
    const newDataset: Dataset = {
      ...dataset,
      id: Math.random().toString(36).substring(7),
      createdAt: new Date()
    };
    this.datasets.set(newDataset.id, newDataset);
    return newDataset;
  }

  search(query: string): Dataset[] {
    return Array.from(this.datasets.values())
      .filter(d => d.name.includes(query) || d.description.includes(query));
  }

  get(id: string): Dataset | undefined {
    return this.datasets.get(id);
  }
}

export const dataCatalog = new DataCatalog();
export default dataCatalog;
