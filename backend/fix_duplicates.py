"""
Script to fix duplicate documents and add unique indexes
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from collections import defaultdict
import os

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

async def fix_duplicates():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.document_management
    
    print("🔍 Starting duplicate fix and index creation...\n")
    
    # Collections to check
    collections = {
        'acts': 'number',
        'invoices': 'number', 
        'waybills': 'number',
        'orders': 'number',
        'contracts': 'number'
    }
    
    for collection_name, number_field in collections.items():
        print(f"\n{'='*60}")
        print(f"📦 Processing collection: {collection_name}")
        print(f"{'='*60}")
        
        collection = db[collection_name]
        
        # Find all documents
        all_docs = await collection.find({}).to_list(10000)
        print(f"Total documents: {len(all_docs)}")
        
        # Group by (user_id, number)
        duplicates = defaultdict(list)
        for doc in all_docs:
            key = (doc.get('user_id'), doc.get(number_field))
            duplicates[key].append(doc)
        
        # Find and fix duplicates
        duplicate_count = 0
        deleted_count = 0
        
        for key, docs in duplicates.items():
            if len(docs) > 1:
                duplicate_count += 1
                user_id, doc_number = key
                print(f"\n⚠️  Found {len(docs)} duplicates for user={user_id}, {number_field}={doc_number}")
                
                # Sort by created_at or updated_at to keep the newest
                docs_sorted = sorted(docs, key=lambda x: x.get('created_at', x.get('updated_at', '')), reverse=True)
                
                # Keep the first (newest), delete others
                keep_doc = docs_sorted[0]
                delete_docs = docs_sorted[1:]
                
                print(f"   ✅ Keeping: _id={keep_doc['_id']} (created: {keep_doc.get('created_at', 'N/A')})")
                
                for doc in delete_docs:
                    print(f"   ❌ Deleting: _id={doc['_id']} (created: {doc.get('created_at', 'N/A')})")
                    result = await collection.delete_one({"_id": doc["_id"]})
                    if result.deleted_count > 0:
                        deleted_count += 1
        
        if duplicate_count == 0:
            print(f"✅ No duplicates found in {collection_name}")
        else:
            print(f"\n✅ Fixed {duplicate_count} duplicate groups, deleted {deleted_count} documents")
        
        # Create unique index
        print(f"\n🔨 Creating unique index on (user_id, {number_field})...")
        try:
            await collection.create_index(
                [("user_id", 1), (number_field, 1)], 
                unique=True,
                name=f"unique_user_{number_field}"
            )
            print(f"✅ Unique index created for {collection_name}")
        except Exception as e:
            print(f"⚠️  Index creation note: {e}")
    
    # List all indexes for verification
    print(f"\n{'='*60}")
    print("📋 Verifying indexes...")
    print(f"{'='*60}")
    
    for collection_name in collections.keys():
        collection = db[collection_name]
        indexes = await collection.index_information()
        print(f"\n{collection_name} indexes:")
        for idx_name, idx_info in indexes.items():
            print(f"  - {idx_name}: {idx_info.get('key', [])}")
    
    print("\n✅ All done!")
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_duplicates())
