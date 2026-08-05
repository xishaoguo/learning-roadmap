// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ErxiaoNotebook
/// @notice A public learning journal for the Sepolia version of Erxiao Lab.
/// @dev Notes are grouped by wallet. Removal only changes the current contract state;
///      previous content remains visible in transaction history.
contract ErxiaoNotebook {
    uint256 public constant MAX_CONTENT_BYTES = 512;

    struct Note {
        uint256 id;
        string content;
        uint64 createdAt;
        uint64 updatedAt;
        bool removed;
    }

    mapping(address author => Note[] notes) private notesByAuthor;

    error EmptyContent();
    error ContentTooLong(uint256 actualLength, uint256 maximumLength);
    error NoteNotFound(uint256 id);
    error NoteAlreadyRemoved(uint256 id);

    event NoteAdded(
        address indexed author,
        uint256 indexed id,
        string content,
        uint64 timestamp
    );
    event NoteEdited(
        address indexed author,
        uint256 indexed id,
        string content,
        uint64 timestamp
    );
    event NoteRemoved(
        address indexed author,
        uint256 indexed id,
        uint64 timestamp
    );

    modifier validContent(string calldata content) {
        uint256 contentLength = bytes(content).length;
        if (contentLength == 0) revert EmptyContent();
        if (contentLength > MAX_CONTENT_BYTES) {
            revert ContentTooLong(contentLength, MAX_CONTENT_BYTES);
        }
        _;
    }

    modifier existingNote(uint256 id) {
        if (id >= notesByAuthor[msg.sender].length) revert NoteNotFound(id);
        if (notesByAuthor[msg.sender][id].removed) {
            revert NoteAlreadyRemoved(id);
        }
        _;
    }

    function addNote(
        string calldata content
    ) external validContent(content) returns (uint256 id) {
        id = notesByAuthor[msg.sender].length;
        uint64 timestamp = uint64(block.timestamp);
        notesByAuthor[msg.sender].push(
            Note({
                id: id,
                content: content,
                createdAt: timestamp,
                updatedAt: timestamp,
                removed: false
            })
        );
        emit NoteAdded(msg.sender, id, content, timestamp);
    }

    function editNote(
        uint256 id,
        string calldata content
    ) external validContent(content) existingNote(id) {
        Note storage note = notesByAuthor[msg.sender][id];
        note.content = content;
        note.updatedAt = uint64(block.timestamp);
        emit NoteEdited(msg.sender, id, content, note.updatedAt);
    }

    function removeNote(uint256 id) external existingNote(id) {
        Note storage note = notesByAuthor[msg.sender][id];
        note.removed = true;
        note.updatedAt = uint64(block.timestamp);
        emit NoteRemoved(msg.sender, id, note.updatedAt);
    }

    function getNotes(address author) external view returns (Note[] memory) {
        return notesByAuthor[author];
    }

    function noteCount(address author) external view returns (uint256) {
        return notesByAuthor[author].length;
    }
}
