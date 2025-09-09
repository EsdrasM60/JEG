# Media export/import (GridFS)

Media (GridFS) lives in MongoDB. To move everything:

1) If you already store media in the same DB as data (MONGODB_URI), nothing else is needed.
2) If you use a separate DB for media (MONGODB_MEDIA_URI), copy that DB as well.

## Dump from source

mongodump --uri="$SRC_MONGO" --db "$SRC_DB" --out ./dump

## Restore into target

mongorestore --uri="$DEST_MONGO" --nsInclude "$SRC_DB.fs.*" ./dump/"$SRC_DB"

Notes:

- Images are in buckets: uploads.fs.files/uploads.fs.chunks; thumbnails in uploads_thumb.fs.*
- Fichas PDFs (if any) are in bucket: fichas.fs.*
- If using MONGODB_MEDIA_URI, dump/restore from that database.
