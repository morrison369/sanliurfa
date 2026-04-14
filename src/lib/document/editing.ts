/**
 * Document Editing Module
 * Stub implementation for collaborative document editing
 */

export interface Document {
  id: string;
  title: string;
  content: string;
  version: number;
  updatedAt: Date;
}

export interface EditOperation {
  type: 'insert' | 'delete';
  position: number;
  content?: string;
  length?: number;
}

export class DocumentEditor {
  private documents: Map<string, Document> = new Map();

  create(title: string, content = ''): Document {
    const document: Document = {
      id: Math.random().toString(36).substring(7),
      title,
      content,
      version: 1,
      updatedAt: new Date()
    };
    this.documents.set(document.id, document);
    return document;
  }

  applyEdit(docId: string, operation: EditOperation): boolean {
    const doc = this.documents.get(docId);
    if (!doc) return false;

    if (operation.type === 'insert' && operation.content) {
      doc.content = doc.content.slice(0, operation.position) + 
                    operation.content + 
                    doc.content.slice(operation.position);
    } else if (operation.type === 'delete' && operation.length) {
      doc.content = doc.content.slice(0, operation.position) + 
                    doc.content.slice(operation.position + operation.length);
    }

    doc.version++;
    doc.updatedAt = new Date();
    return true;
  }

  get(id: string): Document | undefined {
    return this.documents.get(id);
  }
}

export const documentEditor = new DocumentEditor();
export default documentEditor;
