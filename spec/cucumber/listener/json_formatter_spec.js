/* jshint -W106 */
require('../../support/spec_helper');

describe("Cucumber.Listener.JsonFormatter", function () {
  var Cucumber = requireLib('cucumber');
  var jsonFormatter, options;

  beforeEach(function () {
    options = {};
    var formatter = createSpyWithStubs("formatter", {finish: null, log: null});
    spyOn(Cucumber.Listener, 'Formatter').and.returnValue(formatter);
    jsonFormatter = Cucumber.Listener.JsonFormatter(options);
  });

  describe("no features", function () {
    var callback;

    beforeEach(function () {
      callback = createSpy("callback");
    });

    it("calls finish with the callback", function () {
      jsonFormatter.handleAfterFeaturesEvent({}, callback);
      expect(jsonFormatter.finish).toHaveBeenCalledWith(callback);
    });
  });

  describe("one feature", function() {
    var callback, event;

    beforeEach(function () {
      var tag1 = createSpyWithStubs('tag1', {getName: 'tag 1', getLine: 1});
      var tag2 = createSpyWithStubs('tag2', {getName: 'tag 2', getLine: 1});
      var feature = createSpyWithStubs("feature", {
        getKeyword: 'Feature',
        getName: 'A Feature Name',
        getDescription: 'A Feature Description',
        getLine: 2,
        getUri: 'uri',
        getTags: [tag1, tag2]
      });
      var event = createSpyWithStubs("event", {getPayloadItem: feature});
      callback = createSpy("callback");
      jsonFormatter.handleBeforeFeatureEvent(event, callback);
    });

    it("calls back", function () {
      expect(callback).toHaveBeenCalled();
    });

    describe("with no scenarios", function () {
      beforeEach(function () {
        jsonFormatter.handleAfterFeaturesEvent({}, function() {});
      });

      it("outputs the feature", function () {
        expect(jsonFormatter.log).toHaveBeenCalled();
        var json = jsonFormatter.log.calls.mostRecent().args[0];
        var features = JSON.parse(json);
        expect(features).toEqual([{
          description: 'A Feature Description',
          elements: [],
          id: 'a-feature-name',
          keyword: 'Feature',
          line: 2,
          name: 'A Feature Name',
          tags: [
            {name: 'tag 1', line: 1},
            {name: 'tag 2', line: 1},
          ],
          uri: 'uri'
        }]);
      });
    });

    describe("with a scenario", function () {
      beforeEach(function () {
        var tag1 = createSpyWithStubs('tag1', {getName: 'tag 1', getLine: 3});
        var tag2 = createSpyWithStubs('tag2', {getName: 'tag 2', getLine: 3});
        var scenario = createSpyWithStubs("scenario", {
          getKeyword: 'Scenario',
          getName: 'A Scenario Name',
          getDescription: 'A Scenario Description',
          getLine: 4,
          getTags: [tag1, tag2]
        });
        event = createSpyWithStubs("event", {getPayloadItem: scenario});
        callback = createSpy("callback");
        jsonFormatter.handleBeforeScenarioEvent(event, callback);
      });

      it("calls back", function () {
        expect(callback).toHaveBeenCalled();
      });

      describe("with no steps", function () {
        beforeEach(function () {
          jsonFormatter.handleAfterFeaturesEvent({}, function() {});
        });

        it("outputs the feature and the scenario", function () {
          expect(jsonFormatter.log).toHaveBeenCalled();
          var json = jsonFormatter.log.calls.mostRecent().args[0];
          var features = JSON.parse(json);
          expect(features[0].elements).toEqual([{
            description: 'A Scenario Description',
            id: 'a-feature-name;a-scenario-name',
            keyword: 'Scenario',
            line: 4,
            name: 'A Scenario Name',
            steps: [],
            tags: [
              {name: 'tag 1', line: 3},
              {name: 'tag 2', line: 3}
            ],
            type: 'scenario'
          }]);
        });
      });

      describe("with a step", function () {
        var step, stepResult;

        beforeEach(function() {
          step = createSpyWithStubs("step", {
            getArguments: [],
            getLine: 1,
            getKeyword: 'Step',
            getName: 'A Step Name',
            isHidden: false
          });

          stepResult = createSpyWithStubs("stepResult", {
            getDuration: 1,
            getFailureException: null,
            getStatus: Cucumber.Status.PASSED,
            getStep: step,
            hasAttachments: false,
            getAttachments: []
          });

          event = createSpyWithStubs("event", {getPayloadItem: stepResult});
          callback = createSpy("callback");
        });

        describe("that is passing", function () {
          beforeEach(function() {
            jsonFormatter.handleStepResultEvent(event, callback);
            jsonFormatter.handleAfterFeaturesEvent({}, function() {});
          });

          it("calls back", function () {
            expect(callback).toHaveBeenCalled();
          });

          it("outputs the step with a hidden attribute", function () {
            expect(jsonFormatter.log).toHaveBeenCalled();
            var json = jsonFormatter.log.calls.mostRecent().args[0];
            var features = JSON.parse(json);
            expect(features[0].elements[0].steps).toEqual([{
              arguments: [],
              line: 1,
              keyword: 'Step',
              name: 'A Step Name',
              result: {
                status: 'passed',
                duration: 1
              }
            }]);
          });
        });

        describe("that is failing", function () {
          beforeEach(function() {
            stepResult.getStatus.and.returnValue(Cucumber.Status.FAILED);
            stepResult.getFailureException.and.returnValue({stack: 'failure stack'});
            jsonFormatter.handleStepResultEvent(event, callback);
            jsonFormatter.handleAfterFeaturesEvent({}, function() {});
          });

          it("calls back", function () {
            expect(callback).toHaveBeenCalled();
          });

          it("outputs the step with a hidden attribute", function () {
            expect(jsonFormatter.log).toHaveBeenCalled();
            var json = jsonFormatter.log.calls.mostRecent().args[0];
            var features = JSON.parse(json);
            expect(features[0].elements[0].steps[0].result).toEqual({
              status: 'failed',
              error_message: 'failure stack',
              duration: 1
            });
          });
        });

        describe("that is hidden", function () {
          beforeEach(function() {
            step.isHidden.and.returnValue(true);
            jsonFormatter.handleStepResultEvent(event, callback);
            jsonFormatter.handleAfterFeaturesEvent({}, function() {});
          });

          it("calls back", function () {
            expect(callback).toHaveBeenCalled();
          });

          it("does not output a line attribute and outputs a hidden attribute", function () {
            expect(jsonFormatter.log).toHaveBeenCalled();
            var json = jsonFormatter.log.calls.mostRecent().args[0];
            var features = JSON.parse(json);
            expect(features[0].elements[0].steps[0].hasOwnProperty('line')).toEqual(false);
            expect(features[0].elements[0].steps[0].hidden).toEqual(true);
          });
        });

        describe("with a doc string", function () {
          beforeEach(function (){
            var docString = createSpyWithStubs("docString", {
              getContent: "This is a DocString",
              getLine: 2,
              getContentType: null,
              getType: 'DocString'
            });
            step.getArguments.and.returnValue([docString]);
            jsonFormatter.handleStepResultEvent(event, callback);
            jsonFormatter.handleAfterFeaturesEvent({}, function() {});
          });

          it("calls back", function () {
            expect(callback).toHaveBeenCalled();
          });

          it("outputs the step with a hidden attribute", function () {
            expect(jsonFormatter.log).toHaveBeenCalled();
            var json = jsonFormatter.log.calls.mostRecent().args[0];
            var features = JSON.parse(json);
            expect(features[0].elements[0].steps[0].arguments).toEqual([{
              line: 2,
              content: 'This is a DocString',
              contentType: null
            }]);
          });
        });

        describe("with a data table", function () {
          beforeEach(function (){
            var dataTable = createSpyWithStubs("dataTable", {
              getType: 'DataTable',
              raw: [
                ['a:1', 'a:2', 'a:3'],
                ['b:1', 'b:2', 'b:3'],
                ['c:1', 'c:2', 'c:3']
              ]
            });
            step.getArguments.and.returnValue([dataTable]);
            jsonFormatter.handleStepResultEvent(event, callback);
            jsonFormatter.handleAfterFeaturesEvent({}, function() {});
          });

          it("calls back", function () {
            expect(callback).toHaveBeenCalled();
          });

          it("outputs the step with a hidden attribute", function () {
            expect(jsonFormatter.log).toHaveBeenCalled();
            var json = jsonFormatter.log.calls.mostRecent().args[0];
            var features = JSON.parse(json);
            expect(features[0].elements[0].steps[0].arguments).toEqual([{
              rows: [
                {cells: ['a:1', 'a:2', 'a:3'] },
                {cells: ['b:1', 'b:2', 'b:3'] },
                {cells: ['c:1', 'c:2', 'c:3'] }
              ]
            }]);
          });
        });

        describe("with attachments", function () {
          beforeEach(function (){
            var attachment1 = createSpyWithStubs("first attachment", {getMimeType: "first mime type", getData: "first data"});
            var attachment2 = createSpyWithStubs("second attachment", {getMimeType: "second mime type", getData: "second data"});
            var attachments = [attachment1, attachment2];
            stepResult.hasAttachments.and.returnValue(true);
            stepResult.getAttachments.and.returnValue(attachments);
            jsonFormatter.handleStepResultEvent(event, callback);
            jsonFormatter.handleAfterFeaturesEvent({}, function() {});
          });

          it("calls back", function () {
            expect(callback).toHaveBeenCalled();
          });

          it("outputs the step with a hidden attribute", function () {
            expect(jsonFormatter.log).toHaveBeenCalled();
            var json = jsonFormatter.log.calls.mostRecent().args[0];
            var features = JSON.parse(json);
            expect(features[0].elements[0].steps[0].embeddings).toEqual([
              {data: 'Zmlyc3QgZGF0YQ==', mime_type: 'first mime type'},
              {data: 'c2Vjb25kIGRhdGE=', mime_type: 'second mime type'}
            ]);
          });
        });
      });
    });
  });
});
