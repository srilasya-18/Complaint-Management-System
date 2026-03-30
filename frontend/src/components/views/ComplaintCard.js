import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Avatar,
} from "@mui/material";

const BASE_URL = "http://localhost:5001";

export const ComplaintCard = ({ complaint, viewHandler }) => {


  console.log("PHOTO DATA:", complaint.photos);
console.log("FULL URL:", BASE_URL + complaint?.photos?.[0]?.url);
  return (
    <Card>
      <CardContent>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <Avatar>{complaint.complainee.name.charAt(0)}</Avatar>
          </Grid>
          <Grid item>
            <Typography variant="h7" color="text.primary">
              Author : <b>{complaint.complainee.name}</b>
            </Typography>
          </Grid>
        </Grid>
        <Grid
          container
          alignItems="center"
          xs={10}
          style={{ marginTop: "15px" }}
        >
          <Grid item>
            <Typography variant="h6" component="div">
              {complaint.complaint_category}
            </Typography>
            <Typography
              variant="subtitle1"
              color="textSecondary"
              style={{ marginTop: "12px" }}
            >
              Section - {complaint.section}
            </Typography>
          </Grid>
        </Grid>
        {complaint.photos && complaint.photos.length > 0 && (
          <Grid container style={{ marginTop: "15px" }}>
            <img
              src={BASE_URL + complaint.photos[0].url}
              alt="complaint"
              style={{
                width: "100%",
                maxHeight: "200px",
                objectFit: "cover",
                borderRadius: "8px",
              }}
            />
          </Grid>
        )}
        <Button
          variant="outlined"
          color="primary"
          onClick={() => { viewHandler(complaint._id) }}
          style={{ marginTop: "5px" }}
        >
          View More
        </Button>
      </CardContent>
    </Card>
  );
};
