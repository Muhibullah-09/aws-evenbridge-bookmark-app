import React, { useState, useRef, useEffect } from "react";
import { addBookmark } from "../graphql/mutations";
import { getBookmarks } from "../graphql/queries";
import { deleteBookmark } from "../graphql/mutations";
import { API } from "aws-amplify";
import { Container, Button, Input, Label, Heading } from 'theme-ui';
import Map from '../components/card';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [bookmarkData, setBookmarkData] = useState<any>(null);
  const bookmarkDescRef = useRef<any>("");
  const bookmarkUrlRef = useRef<any>("");

  const submitBookmark = async () => {
    try {
      const bookmark = {
        desc: bookmarkDescRef.current.value,
        url: bookmarkUrlRef.current.value
      }
      await API.graphql({
        query: addBookmark,
        variables: {
          bookmark: bookmark,
        },
      })
      bookmarkDescRef.current.value = ""
      bookmarkUrlRef.current.value = ""
      fetchBookmark();
    } catch (e) {
      console.log(e)
    }
  }

  const fetchBookmark = async () => {
    try {
      const data = await API.graphql({
        query: getBookmarks,
      })
      setBookmarkData(data);
      console.log(data);
      setLoading(false)
    } catch (e) {
      console.log(e)
    }
  }
  useEffect(() => {
    fetchBookmark()
  }, [])

  return (
    <Container>
      {loading ? (
        <Heading sx={{ color: 'black', fontFamily: 'monospace', textAlign: "center" }}>Loading...</Heading>
      ) : (
          <div>
            <Heading sx={{ color: 'black', fontFamily: 'monospace', textAlign: "center" }}>BookMark App</Heading>
            <Container p={4} bg='muted'>
              <Label sx={{ color: 'black', fontFamily: 'monospace' }} >Enter Bookmark Description:</Label>
              <Input type="text" placeholder="Description" ref={bookmarkDescRef} /><br />
              <Label sx={{ color: 'black', fontFamily: 'monospace' }} >Enter Bookmark Url:</Label>
              <Input type="text" placeholder="Enter a valid URL" ref={bookmarkUrlRef} /><br />
              <Button
                sx={{ color: 'red', fontFamily: 'monospace', cursor: 'pointer' }}
                onClick={() => submitBookmark()}
              >
                Add Bookmark</Button><br />
            </Container>
            <Heading sx={{ color: 'black', fontFamily: 'monospace', textAlign: "center" }}>BookMark List</Heading>
            {bookmarkData.data &&
              bookmarkData.data.getBookmarks.map((item, ind) => (
                <div style={{ marginLeft: "1rem", marginTop: "2rem" }} key={ind}>
                  <Map url={item.url} desc={item.desc} />
                  {/* <p>{item.desc}</p><br />
                  <a href={item.url}>{item.url}</a> */}
                  <div>
                    <Button
                      sx={{ color: 'red', fontFamily: 'monospace', cursor: 'pointer' }}
                      onClick={async e => {
                        e.preventDefault();
                        await API.graphql({
                          query: deleteBookmark,
                          variables: { bookmarkId: item.id },
                        })
                        fetchBookmark();
                      }}
                    >Delete</Button>
                  </div>
                </div>
              ))}
          </div>
        )}
    </Container>
  )
}