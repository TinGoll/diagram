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
    border: 1px solid #dfdfdf;

    padding-top: 8px;
  }
`;

export const App = () => {
  return (
    <StyledApp>
      <Grid>
        <div className="block">
          <TimelineChart
            getBarHighlightColor={(bar) => bar.value > 5 ? '#ED413E' : '#B2AB2E'}
            bars={Array.from({ length: 20000 }, (_, i) => ({
              id: `bar-${i}`,
              value: Math.random() * 10,
              color: i > 120 ? "#f66" : "#ccc",
            }))}
            onBarClick={(id, bar) => console.log("Clicked:", id, bar)}
          />
        </div>
        <div className="block">
          {/* <TimelineChart
            bars={Array.from({ length: 100 }, (_, i) => ({
              id: `bar-${i}`,
              value: Math.random() * 100,
              color: i > 120 ? "#f66" : "#ccc",
            }))}
            onBarClick={(id) => console.log("Clicked:", id)}
          /> */}
        </div>
      </Grid>
    </StyledApp>
  );
};
