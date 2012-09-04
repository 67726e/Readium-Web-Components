// Description: This file defines a grammar for the EPUB CFI specification. CFIs can be viewed as a Domain Specific Language (DSL)
//   for creating unique, recoverable and sortable indexes for EPUBs. This grammar is used with PEG.js to generate a
//   parser for CFI strings.
// Rationale: The CFI specification defines an EBNF grammar for CFIs. Given that the grammar is provided by the spec, using a 
//   parser generator as the mechanism for building and maintaining a lexer/parser seems appropriate for a number of reasons. 
//   First, using a parser-generator with a well-specified grammar ensures a more complete and bug-free lexing/parsing solution, as 
//   opposed to writing the lexer/parser by hand. Second, it will be easier to maintain a parser generator solution over time, as 
//   changes to the specs or requirements can be more easily accomodated in a more logically organized toolchain. Third, an
//   implementation of CFIs require that a CFI be lexed and parsed. This part of the problem is irreducible. As such, it makes sense to //   leverage existing tools and methodologies, rather than build a custom solution. Last but not least, I'm already familiar with 
//   parser generator tools, which lowers the fixed costs using this tool. 

// Changes from spec grammar: 
// 1) "index step" and "indirection step are differentiated" instead of having the "!" in the local_path non-terminal
// 2) "Assertion" split into id-assertion and terminating-assertion
// 3) "CSV" changed to reflect that it should probably only be TWO comma-separated values 
// 4) "CSV" changed to reflect that [,aaa] is valid; this is not allowed by the grammar, I believe
// 5) "String" removed as redundant
// 6) "Special-chars" removed as unnecessary due to PEG sequential match
// 7) "character" will not include "space" in order to facilitate the handling of spaces in assertion values

fragment
  = "epubcfi(" pathVal:path ")" { return { type:"CFIAST", cfiString:pathVal }; }

path 
  = stepVal:indexStep localPathVal:local_path { return { type:"cfiString", path:stepVal, localPath:localPathVal }; }

local_path
  = localPathStepVal:(indexStep / indirectionStep)+ termStepVal:termstep? { return { steps:localPathStepVal, termStep:termStepVal }; }

indexStep
  = "/" stepLengthVal:integer { return { type:"indexStep", stepLength:stepLengthVal }; }

indirectionStep
  = "!/" stepLengthVal:integer { return { type:"indirectionStep", stepLength:stepLengthVal }; }

termstep
  = terminus

terminus
  = ":" textOffsetValue:integer { return { type:"textTerminus", offsetValue:textOffsetValue }; }

assertion
  = csvVal:csv? paramVal:parameter* { return { csvs:csvVal, parameters:paramVal }; }

parameter
  = paramVal:(";" valueNoSpace "=" csv) { return paramVal; }

csv 
  = firstVal:value remainingVal:("," value)* { return { first:firstVal, rest:remainingVal }; }

// PEG.js does not have an "except" operator. My understanding is that "value-no-space" means "no spaces at all"
valueNoSpace
  = valueVal:characterEscapedSpecial+ { return valueVal.join(''); }

// Removed stringEscapedSpecialChars as it was redundant
value 
  = valueVal:(characterEscapedSpecial / space)+ { return valueVal.join(''); }

// Sequential matching made special-chars redundant as they'll be matched by escapedSpecialChars
characterEscapedSpecial 
  = charEscSpecVal:(escapedSpecialChars / character) { return charEscSpecVal; }

escapedSpecialChars
  = escSpecCharVal:(
      (circumflex circumflex) 
    / (circumflex squareBracket) 
    / (circumflex parentheses) 
    / (circumflex comma) 
    / (circumflex semicolon)
    / (circumflex equal) 
    ) { 
        return escSpecCharVal; 
    }

number 
  = intPartVal:( [1-9][0-9]+ ) "." fracPartVal:( [0-9]* [1-9] ) { return intPartVal.join('') + "." + fracPartVal.join('') ; }

// Digit and digit-non-zero not included as they are implicitly included in the 'integer' rule
integer
  = integerVal:("0" / [1-9][0-9]*) { 

        if (integerVal === "0") { 
          return "0" 
        } 
        else { 
          return integerVal[0].concat(integerVal[1].join('')) 
        } 
    }

space 
  = " " { return " "; }

circumflex
  = "^" { return "^"; }

doubleQuote
  = '"' { return '"'; }

squareBracket
  = bracketVal:("[" / "]") { return bracketVal; }

parentheses
  = paraVal:( "(" / ")" ) { return paraVal; }

comma
  = "," { return ","; }

semicolon
  = ";" { return ";"; }

equal
  = "=" { return "="; }

character
  = charVal:[a-z][A-Z] { return charVal.join(''); }
