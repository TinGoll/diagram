import styled from "@emotion/styled";
import { TimelineChart } from "./TimelineChart";

const StyledApp = styled.div`
  min-height: 100vh;
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: 450px 1fr;
  & .block {
    min-height: 0px;
    min-width: 0px;
    border: 2px solid pink;
    padding: 8px;
    padding-bottom: 0;
  }
`;

export const App = () => {
  return (
    <StyledApp>
      <Grid>
        <div className="block">
          <TimelineChart
            bars={Array.from({ length: 200 }, (_, i) => ({
              id: `bar-${i}`,
              value: Math.random() * 100,
              color: i > 120 ? "#f66" : "#ccc",
            }))}
            onBarClick={(id) => console.log("Clicked:", id)}
          />
        </div>
        <div className="block">
          <TimelineChart
            bars={Array.from({ length: 30 }, (_, i) => ({
              id: `bar-${i}`,
              value: Math.random() * 100,
              color: i > 120 ? "#f66" : "#ccc",
            }))}
            onBarClick={(id) => console.log("Clicked:", id)}
          />
        </div>
      </Grid>
    </StyledApp>
  );
};
