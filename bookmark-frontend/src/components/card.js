import { Card , Text} from 'theme-ui';
import React from 'react';

export default function Map({ url, desc }) {
    return <div>
        <Card 
        sx={{ maxWidth: 1000 ,padding: 2,borderRadius: 4,boxShadow: '0 0 8px rgba(0, 0, 0, 0.125)'}}>
            <a href={url} target="_blank" rel="noreferrer" className="url">{url}</a><br/>
            <Text>
                {desc.toUpperCase()}
            </Text>
        </Card>
    </div>
}