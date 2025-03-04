import React from 'react'
import { File, Image, Video, FileText, Download, Music } from 'lucide-react'

interface AttachmentDisplayProps {
  attachment: {
    id: string
    name: string
    url: string
    type: 'image' | 'video' | 'document' | 'link' | 'other' | 'audio'
    size?: number
  }
  color?: string;
}

export const AttachmentDisplay: React.FC<AttachmentDisplayProps> = ({ attachment, color = 'text-gray-600' }) => {
  const getAttachmentIcon = () => {
    switch (attachment.type) {
      case 'image':
        return <Image size={16} className={color} />;
      case 'video':
        return <Video size={16} className={color} />;
      case 'document':
        return <FileText size={16} className={color} />;
      case 'audio':
        return <Music size={16} className={color} />;
      default:
        return <File size={16} className={color} />;
    }
  };

  return (
    <>
      {getAttachmentIcon()}
      <a
        href={attachment.url}
        download={attachment.name}
        className={`ml-2 text-sm text-gray-700 hover:underline truncate flex-grow`}
        style={{ maxWidth: '150px' }}
      >
        {attachment.name}
      </a>
      <a
        href={attachment.url}
        download={attachment.name}
        className="ml-2 px-2 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center"
      >
        <Download size={14} />
      </a>
    </>
  )
}
