require('../../support/spec_helper');

describe("Cucumber.Ast.Scenario", function () {
  var Cucumber = requireLib('cucumber');
  var scenario, step1, step2, tag1, tag2;

  beforeEach(function () {
    var scenarioData = {
      description: 'description',
      keyword: 'keyword',
      locations: [{line: 1}, {line: 2}],
      name: 'name',
      path: 'path',
      steps: [
        {step1: 'data'},
        {step2: 'data'}
      ],
      tags: [
        {tag1: 'data'},
        {tag2: 'data'}
      ]
    };

    step1 = createSpyWithStubs('step 1', {setPreviousStep: null});
    step2 = createSpyWithStubs('step 2', {setPreviousStep: null});
    spyOn(Cucumber.Ast, 'Step').and.returnValues(step1, step2);

    tag1 = createSpy('tag 1');
    tag2 = createSpy('tag 2');
    spyOn(Cucumber.Ast, 'Tag').and.returnValues(tag1, tag2);

    scenario = Cucumber.Ast.Scenario(scenarioData);
  });

  describe("constructor", function () {
    it('creates steps', function () {
      expect(Cucumber.Ast.Step).toHaveBeenCalledWith({step1: 'data', uri: 'path'});
      expect(Cucumber.Ast.Step).toHaveBeenCalledWith({step2: 'data', uri: 'path'});
      expect(step1.setPreviousStep).toHaveBeenCalledWith(undefined);
      expect(step2.setPreviousStep).toHaveBeenCalledWith(step1);
    });

    it('creates tags', function () {
      expect(Cucumber.Ast.Tag).toHaveBeenCalledWith({tag1: 'data'});
      expect(Cucumber.Ast.Tag).toHaveBeenCalledWith({tag2: 'data'});
    });
  });

  describe("getKeyword()", function () {
    it("returns the keyword of the scenario", function () {
      expect(scenario.getKeyword()).toEqual('keyword');
    });
  });

  describe("getName()", function () {
    it("returns the name of the scenario", function () {
      expect(scenario.getName()).toEqual('name');
    });
  });

  describe("getDescription()", function () {
    it("returns the description of the scenario", function () {
      expect(scenario.getDescription()).toEqual('description');
    });
  });

  describe("getUri()", function () {
    it("returns the URI on which the background starts", function () {
      expect(scenario.getUri()).toEqual('path');
    });
  });

  describe("getLine()", function () {
    it("returns the line on which the scenario starts", function () {
      expect(scenario.getLine()).toEqual(1);
    });
  });

  describe("getTags()", function () {
    it("returns the tags", function () {
      expect(scenario.getTags()).toEqual([tag1, tag2]);
    });
  });

  describe("acceptVisitor", function () {
    var visitor, callback;

    beforeEach(function () {
      visitor  = createSpyWithStubs("visitor", {visitStep: null});
      callback = createSpy("callback");
      scenario.acceptVisitor(visitor, callback);
    });

    it("instructs the visitor to visit the first step", function() {
      expect(visitor.visitStep).toHaveBeenCalledWith(step1, jasmine.any(Function));
    });

    describe('after the first step is visited', function () {
      beforeEach(function() {
        visitor.visitStep.calls.mostRecent().args[1]();
      });

      it("instructs the visitor to visit the second step", function() {
        expect(visitor.visitStep).toHaveBeenCalledWith(step2, jasmine.any(Function));
      });

      describe('after the second step is visited', function () {
        beforeEach(function() {
          visitor.visitStep.calls.mostRecent().args[1]();
        });

        it("calls back", function() {
          expect(callback).toHaveBeenCalled();
        });
      });
    });
  });
});
